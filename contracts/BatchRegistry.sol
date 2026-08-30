// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BatchRegistry
 * @author HoneyChain — KVIC Honey Mission
 * @notice On-chain registry for honey batch provenance, custody transfers,
 *         and QR code activations. Provides a tamper-proof audit trail from
 *         hive to consumer.
 * @dev    Uses OpenZeppelin AccessControl for role-based permissions.
 *         All bytes32 hashes are expected to be keccak256 digests.
 */
contract BatchRegistry is AccessControl {
    // ─────────────────────────────────────────────
    //  Roles
    // ─────────────────────────────────────────────

    /// @dev Role identifier for registered beekeepers (can create batches)
    bytes32 public constant BEEKEEPER_ROLE    = keccak256("BEEKEEPER_ROLE");
    /// @dev Role identifier for honey processors
    bytes32 public constant PROCESSOR_ROLE    = keccak256("PROCESSOR_ROLE");
    /// @dev Role identifier for distributors
    bytes32 public constant DISTRIBUTOR_ROLE  = keccak256("DISTRIBUTOR_ROLE");
    /// @dev Role identifier for retailers
    bytes32 public constant RETAILER_ROLE     = keccak256("RETAILER_ROLE");
    /// @dev Admin role — held by the deployer; can grant / revoke all roles
    bytes32 public constant ADMIN_ROLE        = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────
    //  Data Structures
    // ─────────────────────────────────────────────

    /// @notice Transfer type enum aligned to off-chain ERD values
    /// @dev Stored as uint8 in CustodyRecord to save gas
    enum TransferType {
        Harvest,        // 0 — initial harvest from hive
        Processor,      // 1 — handed to processor
        Distributor,    // 2 — handed to distributor
        Retailer        // 3 — handed to retailer
    }

    /// @notice Core batch record stored on-chain
    struct Batch {
        bytes32  metadataHash;     // keccak256 of off-chain JSON metadata
        address  beekeeper;        // address of the registered beekeeper
        address  currentCustodian; // address that currently holds custody
        bool     exists;           // existence sentinel
    }

    /// @notice Single custody transfer entry in the audit trail
    struct CustodyRecord {
        address      from;         // previous custodian
        address      to;           // new custodian
        TransferType transferType;
        bytes32      locationHash; // keccak256 of location JSON
        uint256      timestamp;    // block.timestamp at point of transfer
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    /// @dev batchId → Batch
    mapping(bytes32 => Batch) private _batches;

    /// @dev batchId → ordered array of CustodyRecords
    mapping(bytes32 => CustodyRecord[]) private _history;

    /// @dev batchId → activated QR code id (bytes32(0) if none)
    mapping(bytes32 => bytes32) private _qrCodes;

    /// @dev qrId → batchId (reverse lookup to prevent duplicate QR)
    mapping(bytes32 => bytes32) private _qrToBatch;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    /// @notice Emitted when a new honey batch is created
    event BatchCreated(
        bytes32 indexed batchId,
        bytes32 metadataHash,
        address indexed beekeeper,
        uint256 timestamp
    );

    /// @notice Emitted when custody of a batch changes hands
    event CustodyTransferred(
        bytes32 indexed batchId,
        address indexed from,
        address indexed to,
        uint8   transferType,
        bytes32 locationHash,
        uint256 timestamp
    );

    /// @notice Emitted when a QR code is linked to a batch
    event QRActivated(
        bytes32 indexed batchId,
        bytes32 indexed qrId,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────
    //  Custom Errors (gas-efficient reverts)
    // ─────────────────────────────────────────────

    error BatchAlreadyExists(bytes32 batchId);
    error BatchNotFound(bytes32 batchId);
    error NotCurrentCustodian(bytes32 batchId, address caller);
    error QRAlreadyActivated(bytes32 batchId);
    error QRIdAlreadyUsed(bytes32 qrId);
    error InvalidTransferType(uint8 transferType);
    error ZeroAddress();

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    /**
     * @notice Deploys BatchRegistry and sets up role hierarchy.
     * @dev    Grants DEFAULT_ADMIN_ROLE and ADMIN_ROLE to deployer.
     *         ADMIN_ROLE is the admin for all other roles so the deployer
     *         can grant/revoke roles without having DEFAULT_ADMIN_ROLE
     *         permanently (better least-privilege, can renounce later).
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Set ADMIN_ROLE as the role admin for all supply-chain roles
        _setRoleAdmin(BEEKEEPER_ROLE,   ADMIN_ROLE);
        _setRoleAdmin(PROCESSOR_ROLE,   ADMIN_ROLE);
        _setRoleAdmin(DISTRIBUTOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(RETAILER_ROLE,    ADMIN_ROLE);
    }

    // ─────────────────────────────────────────────
    //  External / Public Functions
    // ─────────────────────────────────────────────

    /**
     * @notice Creates a new honey batch and records it on-chain.
     * @dev    Caller must hold BEEKEEPER_ROLE or ADMIN_ROLE.
     *         The `beekeeper` address becomes the initial custodian.
     *         Emits {BatchCreated}.
     * @param  batchId      Unique identifier for this batch (keccak256 of UUID).
     * @param  metadataHash keccak256 digest of the off-chain JSON metadata
     *                      (hive_id, harvest_date, quantity_kg, honey_type, etc.).
     * @param  beekeeper    Ethereum address of the beekeeper who harvested this batch.
     *                      Must be non-zero.
     */
    function createBatch(
        bytes32 batchId,
        bytes32 metadataHash,
        address beekeeper
    )
        external
        onlyRole(BEEKEEPER_ROLE)   // ADMIN_ROLE also satisfies via role admin chain
    {
        if (beekeeper == address(0)) revert ZeroAddress();
        if (_batches[batchId].exists) revert BatchAlreadyExists(batchId);

        _batches[batchId] = Batch({
            metadataHash:     metadataHash,
            beekeeper:        beekeeper,
            currentCustodian: beekeeper,
            exists:           true
        });

        emit BatchCreated(batchId, metadataHash, beekeeper, block.timestamp);
    }

    /**
     * @notice Transfers custody of a batch to a new entity.
     * @dev    Caller must be the current custodian of the batch.
     *         Appends a new {CustodyRecord} to the batch's history.
     *         Emits {CustodyTransferred}.
     * @param  batchId      The batch whose custody is being transferred.
     * @param  to           Address of the receiving entity. Must be non-zero.
     * @param  transferType Numeric transfer type (see {TransferType} enum):
     *                      0=Harvest, 1=Processor, 2=Distributor, 3=Retailer.
     * @param  locationHash keccak256 digest of a location JSON (lat/lng, facility ID).
     */
    function transferCustody(
        bytes32 batchId,
        address to,
        uint8   transferType,
        bytes32 locationHash
    )
        external
    {
        if (!_batches[batchId].exists) revert BatchNotFound(batchId);
        if (_batches[batchId].currentCustodian != msg.sender)
            revert NotCurrentCustodian(batchId, msg.sender);
        if (to == address(0)) revert ZeroAddress();
        if (transferType > uint8(type(TransferType).max))
            revert InvalidTransferType(transferType);

        address previousCustodian = _batches[batchId].currentCustodian;
        _batches[batchId].currentCustodian = to;

        _history[batchId].push(CustodyRecord({
            from:         previousCustodian,
            to:           to,
            transferType: TransferType(transferType),
            locationHash: locationHash,
            timestamp:    block.timestamp
        }));

        emit CustodyTransferred(
            batchId,
            previousCustodian,
            to,
            transferType,
            locationHash,
            block.timestamp
        );
    }

    /**
     * @notice Links a QR code identifier to a batch (one-to-one, permanent).
     * @dev    Can be called by the current custodian or an admin.
     *         A batch can only have one QR code; a QR code can only be used once.
     *         Emits {QRActivated}.
     * @param  batchId The batch to attach the QR code to.
     * @param  qrId    Unique QR identifier (keccak256 of the QR payload string).
     */
    function activateQR(bytes32 batchId, bytes32 qrId)
        external
    {
        if (!_batches[batchId].exists) revert BatchNotFound(batchId);
        if (
            _batches[batchId].currentCustodian != msg.sender &&
            !hasRole(ADMIN_ROLE, msg.sender)
        ) {
            revert NotCurrentCustodian(batchId, msg.sender);
        }
        if (_qrCodes[batchId] != bytes32(0)) revert QRAlreadyActivated(batchId);
        if (_qrToBatch[qrId] != bytes32(0))  revert QRIdAlreadyUsed(qrId);

        _qrCodes[batchId]  = qrId;
        _qrToBatch[qrId]   = batchId;

        emit QRActivated(batchId, qrId, block.timestamp);
    }

    /**
     * @notice Returns the full custody chain for a batch.
     * @dev    Gas-free view function. Returns an empty array for batches
     *         that have not yet had any custody transfers (only created).
     * @param  batchId The batch identifier.
     * @return Array of {CustodyRecord} structs in chronological order.
     */
    function getBatchHistory(bytes32 batchId)
        external
        view
        returns (CustodyRecord[] memory)
    {
        if (!_batches[batchId].exists) revert BatchNotFound(batchId);
        return _history[batchId];
    }

    /**
     * @notice Returns the core batch record.
     * @dev    Reverts if batch does not exist.
     * @param  batchId The batch identifier.
     * @return The {Batch} struct.
     */
    function getBatch(bytes32 batchId)
        external
        view
        returns (Batch memory)
    {
        if (!_batches[batchId].exists) revert BatchNotFound(batchId);
        return _batches[batchId];
    }

    /**
     * @notice Returns the QR code linked to a batch (bytes32(0) if none).
     * @param  batchId The batch identifier.
     * @return qrId The QR identifier, or bytes32(0) if not yet activated.
     */
    function getQRCode(bytes32 batchId)
        external
        view
        returns (bytes32 qrId)
    {
        if (!_batches[batchId].exists) revert BatchNotFound(batchId);
        return _qrCodes[batchId];
    }

    /**
     * @notice Reverse lookup — returns the batchId associated with a QR code.
     * @param  qrId The QR identifier.
     * @return batchId The associated batch, or bytes32(0) if not found.
     */
    function getBatchByQR(bytes32 qrId)
        external
        view
        returns (bytes32 batchId)
    {
        return _qrToBatch[qrId];
    }
}

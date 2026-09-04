import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// Lightweight honeycomb pattern using View-based hexagons
// (avoids needing react-native-svg for basic pattern)
export function HoneycombBackground() {
  const rows = 12;
  const cols = 8;
  const hexSize = 44;
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : hexSize * 0.88;
      cells.push(
        <View
          key={`${row}-${col}`}
          style={[
            styles.hex,
            {
              left: col * hexSize * 1.75 + offsetX,
              top: row * hexSize * 0.8,
              width: hexSize,
              height: hexSize,
              borderRadius: hexSize / 2,
            },
          ]}
        />,
      );
    }
  }

  return <View style={styles.container}>{cells}</View>;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  hex: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(180, 148, 80, 0.15)',
    backgroundColor: 'transparent',
  },
});

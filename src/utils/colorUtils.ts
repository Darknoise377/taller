// /utils/colorUtils.ts (o donde prefieras)
export const colorNameToHex = (colorName: string): string => {
  const lowerColorName = colorName.toLowerCase();
  const colorMap: { [key: string]: string } = {
    // Español a Hex
    rojo: '#FF0000',
    azul: '#0000FF',
    verde: '#008000',
    negro: '#000000',
    blanco: '#FFFFFF',
    amarillo: '#FFFF00',
    naranja: '#FFA500',
    morado: '#800080',
    rosado: '#FFC0CB',
    gris: '#808080',
    marrón: '#A52A2A',
    cafe: '#A52A2A',
    // Inglés a Hex (por si acaso)
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    black: '#000000',
    white: '#FFFFFF',
    // ... puedes añadir todos los colores que necesites
  };

  return colorMap[lowerColorName] || lowerColorName; // Si no lo encuentra, devuelve el original
};
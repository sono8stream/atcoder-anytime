interface ColorStyle {
  color: string;
}

export const ratingColors = [
  '#FF0000',
  '#FF8000',
  '#C0C000',
  '#0000FF',
  '#00C0C0',
  '#008000',
  '#804000',
  '#808080',
];

const getRatingColorStyle: (rating: number) => { color: string } = (
  rating: number
) => {
  const bottomRatings = [2800, 2400, 2000, 1600, 1200, 800, 400, 0];
  for (let i = 0; i < bottomRatings.length; i++) {
    if (rating >= bottomRatings[i]) {
      return { color: ratingColors[i] };
    }
  }
  return { color: ratingColors[ratingColors.length - 1] };
};

export default getRatingColorStyle;

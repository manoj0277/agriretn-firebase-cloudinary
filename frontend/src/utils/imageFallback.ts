export const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";

export const onImgErrorSetFallback = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget as HTMLImageElement;
  if (target.src !== FALLBACK_IMAGE) {
    target.src = FALLBACK_IMAGE;
  }
};
const YearRangeSlider = ({
  minYear,
  maxYear,
  startYear,
  endYear,
  onStartChange,
  onEndChange
}) => {
  const span = Math.max(1, maxYear - minYear)
  const startPercent = ((startYear - minYear) / span) * 100
  const endPercent = ((endYear - minYear) / span) * 100

  return (
    <div className="border border-gray-200 rounded p-2">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
        <span>Min: {startYear}</span>
        <span>Max: {endYear}</span>
      </div>
      <div className="year-range-slider relative h-8">
        <div className="absolute left-0 right-0 top-1/2 z-0 h-1 -translate-y-1/2 rounded bg-gray-200 pointer-events-none" />
        <div
          className="absolute top-1/2 z-0 h-1 -translate-y-1/2 rounded bg-primary pointer-events-none"
          style={{
            left: `${startPercent}%`,
            right: `${100 - endPercent}%`
          }}
        />
        <input
          type="range"
          className="year-range-input year-range-input--min absolute inset-0 z-20 m-0 h-8 bg-transparent"
          min={minYear}
          max={maxYear}
          value={startYear}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="Minimum year"
        />
        <input
          type="range"
          className="year-range-input year-range-input--max absolute inset-0 z-30 m-0 h-8 bg-transparent"
          min={minYear}
          max={maxYear}
          value={endYear}
          onChange={(e) => onEndChange(e.target.value)}
          aria-label="Maximum year"
        />
      </div>
    </div>
  )
}

export default YearRangeSlider

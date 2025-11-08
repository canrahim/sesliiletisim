import React from 'react';

interface SliderProps {
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  min,
  max,
  step,
  value,
  onValueChange,
  className = '',
}) => {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={`w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer slider ${className}`}
      style={{
        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((value[0] - min) / (max - min)) * 100}%, rgb(229 231 235) ${((value[0] - min) / (max - min)) * 100}%, rgb(229 231 235) 100%)`,
      }}
    />
  );
};






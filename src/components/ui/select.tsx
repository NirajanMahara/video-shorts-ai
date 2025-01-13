import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id?: string
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

export function Select({ id, value, onValueChange, children, ...props }: SelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      {...props}
    >
      {children}
    </select>
  )
} 
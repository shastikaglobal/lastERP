import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-slate-700 bg-slate-800 text-slate-300',
        gold: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
        secondary: 'border-slate-700 bg-slate-900 text-slate-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface TagProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof tagVariants> {}

function Tag({ className, variant, ...props }: TagProps) {
  return <div className={cn(tagVariants({ variant }), className)} {...props} />
}

export { Tag, tagVariants }

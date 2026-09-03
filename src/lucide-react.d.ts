declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react'

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }

  export type LucideIcon = FC<LucideProps>

  export const Code2: LucideIcon
  export const TrendingUp: LucideIcon
  export const Megaphone: LucideIcon
  export const DollarSign: LucideIcon
  export const Users: LucideIcon
  export const Scale: LucideIcon
  export const MapPin: LucideIcon
  export const Briefcase: LucideIcon
  export const BarChart2: LucideIcon
  export const Search: LucideIcon
  export const ExternalLink: LucideIcon
  export const ShieldCheck: LucideIcon
}

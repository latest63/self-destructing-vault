declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }
  
  export type Icon = FC<IconProps>;
  
  export const Loader2: Icon;
  export const Trophy: Icon;
  export const Clock: Icon;
  export const AlertCircle: Icon;
  export const Plus: Icon;
  export const Calendar: Icon;
  export const Users: Icon;
  export const ArrowLeft: Icon;
  export const Link: Icon;
  export const ExternalLink: Icon;
  export const CheckCircle: Icon;
  export const XCircle: Icon;
  export const User: Icon;
  export const LogOut: Icon;
  export const Wallet: Icon;
  export const Vault: Icon;
  export const Copy: Icon;
  export const Check: Icon;
  export const X: Icon;
}
import type { SVGProps } from "react";

export function IconeEstrelas(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.2 6.2 L11.96 10.6 L17 11.87 L13.67 15.85 L14.02 21.03 L9.2 19.1 L4.38 21.03 L4.73 15.85 L1.4 11.87 L6.44 10.6Z" />
      <path d="M18.8 1.1 L20.27 3.28 L22.79 4 L21.18 6.07 L21.27 8.7 L18.8 7.8 L16.33 8.7 L16.42 6.07 L14.81 4 L17.33 3.28Z" />
    </svg>
  );
}

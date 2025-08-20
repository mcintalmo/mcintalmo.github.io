import * as React from 'react';

// LinkedIn brand icon (Simple Icons path) replacing deprecated lucide-react brand icon.
// Source path adapted from simpleicons.org (license: CC0 1.0 Universal).
export const IconLinkedIn: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
    <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.849-3.037-1.849 0-2.131 1.445-2.131 2.939v5.667H9.364V9h3.414v1.561h.049c.476-.9 1.637-1.849 3.37-1.849 3.601 0 4.267 2.369 4.267 5.455v6.285zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.069 0-1.144.925-2.069 2.069-2.069 1.143 0 2.069.925 2.069 2.069 0 1.143-.926 2.069-2.069 2.069zM7.119 20.452H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default IconLinkedIn;

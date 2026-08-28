import Image from "next/image";

/** Suprah.ai wordmark — swaps asset by theme since favicon.png (green/white) is dark-background-only and favicon-light.png (pink/black) is its light-background counterpart. */
export function AuthLogo({ className = "h-16 w-auto sm:h-28 md:h-36" }: { className?: string }) {
  return (
    <>
      <Image
        src="/favicon.png"
        alt="Suprah.ai"
        width={512}
        height={256}
        className={`hidden dark:block ${className}`}
        priority
      />
      <Image
        src="/favicon-light.png"
        alt="Suprah.ai"
        width={512}
        height={256}
        className={`block dark:hidden ${className}`}
        priority
      />
    </>
  );
}

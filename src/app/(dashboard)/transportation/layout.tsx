import * as React from "react"
import styles from "./transportation-contrast.module.css"

export default function TransportationLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={styles.scope} data-transportation-contrast>
      {children}
    </div>
  )
}

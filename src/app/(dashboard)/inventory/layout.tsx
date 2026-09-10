import * as React from "react"
import styles from "./inventory-contrast.module.css"

export default function InventoryLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={styles.scope} data-inventory-contrast>
      {children}
    </div>
  )
}
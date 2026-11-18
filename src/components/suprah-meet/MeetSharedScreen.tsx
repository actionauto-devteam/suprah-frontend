"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import styles from "./MeetSharedScreen.module.css";

interface MeetSharedScreenProps {
  tileId: number;
  bind: (tileId: number, element: HTMLVideoElement | null) => void;
  children: React.ReactNode;
}

export function MeetSharedScreen({ tileId, bind, children }: MeetSharedScreenProps) {
  const [expanded, setExpanded] = React.useState(false);
  const bindVideo = React.useCallback((element: HTMLVideoElement | null) => {
    if (!element) return;
    bind(tileId, element);
    return () => {
      element.pause();
      element.srcObject = null;
    };
  }, [bind, tileId]);
  const video = (
    <video ref={bindVideo} autoPlay playsInline muted aria-label="Shared screen"
      className={styles.video} />
  );

  return (
    <div className={styles.stage}>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <div className={styles.viewer}>
          {!expanded && video}
          <DialogTrigger asChild>
            <button type="button" className={styles.expand} aria-label="Expand shared screen">
              <Maximize2 className="size-4" aria-hidden /> Expand
            </button>
          </DialogTrigger>
        </div>
        <DialogContent className={styles.expanded} overlayClassName="z-[100]" showCloseButton={false}>
          <DialogTitle className="sr-only">Shared screen</DialogTitle>
          <div className={styles.fullVideo}>{expanded && video}</div>
          <div className={styles.controls}>
            <DialogDescription className={styles.hint}>Rotate your phone for a larger view.</DialogDescription>
            <DialogClose asChild>
              <button type="button" className={styles.close}>
                <Minimize2 className="size-4" aria-hidden /> Back to meeting
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <div className={styles.people}>{children}</div>
    </div>
  );
}

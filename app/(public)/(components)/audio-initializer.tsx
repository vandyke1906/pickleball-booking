import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const AudioInitializer = () => {
  const [isOpen, setIsOpen] = useState(() => !window.audioUnlocked);

  useEffect(() => {
    setIsOpen(!window.audioUnlocked);
  }, []);

  const handleEnableAudio = () => {
    const audio = new Audio('/audio/chime-sound.mp3');
    audio.volume = 0;
    audio.play()
      .then(() => {
        setIsOpen(false);
        window.audioUnlocked = true; 
      })
      .catch((err) => {
        console.error("Audio playback failed:", err);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Notifications</DialogTitle>
          <DialogDescription>
            To hear audio announcements for court matches, please enable sound.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleEnableAudio}>Enable Sound</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
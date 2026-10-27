import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import IdeasPage from '../pages/IdeasPage';

/** Owner-only idea generator, opened from the AI Assistant header. */
export default function AiIdeasButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Lightbulb className="w-3.5 h-3.5 mr-1 text-yellow-400" /> Ideas
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">AI Idea Generator</DialogTitle>
          <IdeasPage />
        </DialogContent>
      </Dialog>
    </>
  );
}

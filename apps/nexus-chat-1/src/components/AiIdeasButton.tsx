import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useAuth } from 'zitejs/auth';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import IdeasPage from '../pages/IdeasPage';
import { isOwnerEmail } from '../lib/permissions';

/** Owner-only idea generator, opened from the AI Assistant header. Hidden for everyone else. */
export default function AiIdeasButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!isOwnerEmail(user?.email)) return null;
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

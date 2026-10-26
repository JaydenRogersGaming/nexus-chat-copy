import { useSearchParams } from 'react-router-dom';
import { Brush, Music } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@project/components/ui/tabs';
import EmojiMakerPage from './EmojiMakerPage';
import MusicMaker from '../components/art/MusicMaker';

export default function ArtPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'music' ? 'music' : 'draw';
  return (
    <Tabs value={tab} onValueChange={v => setParams({ tab: v })} className="h-full flex flex-col">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-black">🎨 Art Studio</h1>
        <TabsList>
          <TabsTrigger value="draw"><Brush className="w-4 h-4 mr-1" />Drawing</TabsTrigger>
          <TabsTrigger value="music"><Music className="w-4 h-4 mr-1" />Music Maker</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="draw" className="flex-1 min-h-0 mt-0"><EmojiMakerPage mode="draw" /></TabsContent>
      <TabsContent value="music" className="flex-1 min-h-0 overflow-y-auto mt-0 p-4 md:p-6"><MusicMaker /></TabsContent>
    </Tabs>
  );
}

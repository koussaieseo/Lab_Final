import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Image, Video, Edit, Trash2, X, Save } from 'lucide-react';

export default function MediaManager({ isOpen, onClose, userId }) {
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMedia, setEditingMedia] = useState(null);
  const [editAltText, setEditAltText] = useState('');
  const { showToast } = useUiStore();

  useEffect(() => {
    if (isOpen && userId) {
      loadUserMedia();
    }
  }, [isOpen, userId]);

  const loadUserMedia = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUserMedia(userId);
      setMedia(response.media);
    } catch {
      showToast('Failed to load media', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      await api.deleteMedia(mediaId);
      setMedia(media.filter(m => m._id !== mediaId));
      showToast('Media deleted successfully', 'success');
    } catch {
      showToast('Failed to delete media', 'error');
    }
  };

  const handleEditMedia = (mediaItem) => {
    setEditingMedia(mediaItem);
    setEditAltText(mediaItem.altText || '');
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateMedia(editingMedia._id, editAltText);
      setMedia(media.map(m => 
        m._id === editingMedia._id 
          ? { ...m, altText: editAltText }
          : m
      ));
      setEditingMedia(null);
      showToast('Media updated successfully', 'success');
    } catch {
      showToast('Failed to update media', 'error');
    }
  };

  const handleCloseEdit = () => {
    setEditingMedia(null);
    setEditAltText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Media Manager</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-8">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No media found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
              {media.map((mediaItem) => (
                <Card key={mediaItem._id} className="overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    {mediaItem.type === 'image' ? (
                      <img
                        src={mediaItem.url}
                        alt={mediaItem.altText || 'Media'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditMedia(mediaItem)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteMedia(mediaItem._id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 truncate">
                      {mediaItem.altText || 'No description'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(mediaItem.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingMedia} onOpenChange={handleCloseEdit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Media</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingMedia && (
                <>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {editingMedia.type === 'image' ? (
                      <img
                        src={editingMedia.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="editAltText">Alt Text</Label>
                    <Textarea
                      id="editAltText"
                      value={editAltText}
                      onChange={(e) => setEditAltText(e.target.value)}
                      placeholder="Describe this media for accessibility..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveEdit} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCloseEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
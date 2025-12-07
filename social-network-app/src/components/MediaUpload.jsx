import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Upload, X, Image, Video } from 'lucide-react';

export default function MediaUpload({ isOpen, onClose, onUpload, postId = null }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useUiStore();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please select a valid image or video file', 'error');
      return;
    }

    // Validate file size (10MB for images, 50MB for videos)
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`File size must be less than ${file.type.startsWith('image/') ? '10MB' : '50MB'}`, 'error');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      const response = await api.uploadMedia(selectedFile, fileType, postId, altText);
      onUpload(response);
      showToast('Media uploaded successfully!', 'success');
      handleClose();
    } catch {
      showToast('Failed to upload media', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setAltText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {selectedFile ? (
              <div className="space-y-4">
                {preview ? (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mr-2"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Change File
                </Button>
                <div className="mt-4">
                  <Label htmlFor="altText">Alt Text (Optional)</Label>
                  <Textarea
                    id="altText"
                    placeholder="Describe this media for accessibility..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-32">
                  <Upload className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported: JPG, PNG, GIF, MP4, WebM (Max 50MB)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile && (
            <div className="flex space-x-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
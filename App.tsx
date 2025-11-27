import React, { useState, useCallback, useEffect } from 'react';
import { UploadedImage, StitchResult } from './types';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { stitchImages } from './services/imageService';
import { Trash2, Download, ArrowDown, MoveUp, MoveDown, Info, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<StitchResult | null>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (result) URL.revokeObjectURL(result.url);
    };
  }, []);

  const handleFilesSelected = (files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0, 
      height: 0
    }));

    setImages(prev => [...prev, ...newImages]);
    setResult(null); // Reset result when new images added
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
    setResult(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === images.length - 1)
    ) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
    setResult(null);
  };

  const handleStitch = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Small timeout to allow UI to show loading state
      setTimeout(async () => {
        try {
          const res = await stitchImages(images);
          setResult(res);
        } catch (error) {
          console.error(error);
          alert("Failed to stitch images. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }, 100);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `stitched-image-${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    if(confirm("Are you sure you want to remove all images?")) {
        images.forEach(img => URL.revokeObjectURL(img.previewUrl));
        setImages([]);
        setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="bg-blue-600 p-1.5 rounded-lg">
                <ArrowDown className="text-white h-5 w-5" />
             </div>
             <h1 className="text-xl font-bold text-gray-900">Seamless Stitcher</h1>
          </div>
          <div className="flex items-center space-x-4">
             <a href="https://github.com" target="_blank" className="text-sm text-gray-500 hover:text-gray-900">GitHub</a>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Editor */}
          <div className="lg:col-span-5 space-y-6">
            
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold text-gray-800">1. Upload Images</h2>
                 {images.length > 0 && (
                   <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-700 font-medium">Clear All</button>
                 )}
               </div>
               <ImageUploader onFilesSelected={handleFilesSelected} />
            </section>

            {images.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-lg font-semibold text-gray-800">2. Arrange Order</h2>
                   <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{images.length} images</span>
                </div>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {images.map((img, index) => (
                    <div key={img.id} className="group relative flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2 transition-all hover:shadow-md hover:border-blue-200">
                      
                      <div className="flex flex-col space-y-1 mr-3 text-gray-400">
                        <button 
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <MoveUp size={16} />
                        </button>
                        <button 
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === images.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <MoveDown size={16} />
                        </button>
                      </div>

                      <div className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 border border-gray-300">
                        <img src={img.previewUrl} alt="preview" className="h-full w-full object-cover" />
                      </div>
                      
                      <div className="ml-4 flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{img.file.name}</p>
                        <p className="text-xs text-gray-500">{(img.file.size / 1024).toFixed(0)} KB</p>
                      </div>

                      <button 
                        onClick={() => removeImage(img.id)}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

             <div className="sticky bottom-4 z-10">
                <Button 
                   onClick={handleStitch} 
                   disabled={images.length === 0}
                   isLoading={isProcessing}
                   className="w-full h-12 text-lg shadow-lg"
                >
                   {isProcessing ? 'Processing...' : 'Stitch Images'}
                </Button>
             </div>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7">
             <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full min-h-[500px] flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                   <span>3. Result</span>
                   {result && (
                     <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-normal">
                          {result.width} x {result.height}px
                        </span>
                        <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
                           Download Result
                        </Button>
                     </div>
                   )}
                </h2>

                <div className="flex-grow flex items-center justify-center bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden relative">
                   {result ? (
                      <div className="w-full h-full overflow-auto custom-scrollbar p-4 flex justify-center items-start">
                         <img 
                            src={result.url} 
                            alt="Stitched Result" 
                            className="max-w-full shadow-lg"
                         />
                      </div>
                   ) : (
                      <div className="text-center p-8 max-w-sm">
                         <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="text-slate-400" size={32} />
                         </div>
                         <h3 className="text-slate-900 font-medium">No result yet</h3>
                         <p className="text-slate-500 text-sm mt-2">
                            Upload images and click "Stitch Images" to generate your seamless screenshot.
                         </p>
                         <div className="mt-6 bg-blue-50 text-blue-800 text-xs p-3 rounded-md text-left flex items-start">
                            <Info size={14} className="mt-0.5 mr-2 flex-shrink-0" />
                            <p>
                              The width of the <strong>first image</strong> determines the width of the final result. Subsequent images will be scaled to match.
                            </p>
                         </div>
                      </div>
                   )}
                </div>
             </section>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
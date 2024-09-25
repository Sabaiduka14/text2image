'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Download, X, Expand } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface GeneratedImage {
  id: number;
  url: string;
  prompt: string;
  created_at: string;
}

export function TextToImageComponent() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [allImages, setAllImages] = useState<GeneratedImage[]>([])
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null)

  useEffect(() => {
    fetchAllImages()
  }, [])

  const fetchAllImages = async () => {
    try {
      const response = await fetch('/api/generate-image')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Unexpected data format received from server')
      }
      setAllImages(data)
    } catch (err: unknown) {
      console.error('Error fetching images:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching images. Please try again.');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setImageUrl('')
    setLoading(true)
    setProgress(0)
    setEstimatedTime(30)

    const startTime = Date.now()
    const updateProgress = setInterval(() => {
      setProgress((oldProgress) => {
        const newProgress = Math.min(oldProgress + 2, 99)
        const elapsedTime = (Date.now() - startTime) / 1000
        setEstimatedTime(Math.max(0, 30 - elapsedTime))
        return newProgress
      })
    }, 500)

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (!data.url) {
        throw new Error('No image URL received from server')
      }

      setImageUrl(data.url)
      fetchAllImages() // Refresh the list of all images
    } catch (err: unknown) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating the image. Please try again.');
    } finally {
      clearInterval(updateProgress)
      setLoading(false)
      setProgress(100)
    }
  }

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      setError('Failed to download the image. Please try again.');
    }
  };

  const handleFullscreen = (image: GeneratedImage) => {
    setFullscreenImage(image)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="font-bold">
        <CardTitle className="text-3xl font-bold text-center">Text 2 Image</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="generate">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>
          <TabsContent value="generate">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Describe the image you want to generate..."
                  className="flex-grow"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
                <Button type="submit" className="font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </form>
            {loading && (
              <div className="mt-4">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-500 mt-2">
                  Estimated time: {Math.round(estimatedTime)}s
                </p>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="mt-6">
              {imageUrl ? (
                <div className="relative w-full pt-[100%]">
                  <Image
                    src={imageUrl}
                    alt="Generated image"
                    fill
                    style={{ objectFit: "contain" }}
                    className="rounded-lg"
                  />
                  <div className="absolute bottom-2 right-2 flex space-x-2">
                    <Button onClick={() => handleDownload(imageUrl)} size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleFullscreen({ id: 0, url: imageUrl, prompt, created_at: new Date().toISOString() })} size="sm">
                      <Expand className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full pt-[100%] bg-gray-100 rounded-lg relative">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    Image will appear here
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="explore">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allImages.map((img) => (
                <div key={img.id} className="relative aspect-square group">
                  <Image
                    src={img.url}
                    alt={`Generated image ${img.id}`}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-md cursor-pointer"
                    onClick={() => handleFullscreen(img)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                    <Button onClick={() => handleDownload(img.url)} size="sm" className="mr-2">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleFullscreen(img)} size="sm">
                      <Expand className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatDate(img.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={fullscreenImage.url}
              alt="Fullscreen image"
              fill
              style={{ objectFit: "contain" }}
              className="p-4"
            />
            <Button
              className="absolute top-4 right-4"
              onClick={() => setFullscreenImage(null)}
              variant="secondary"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
              <p><strong>Prompt:</strong> {fullscreenImage.prompt}</p>
              <p><strong>Created:</strong> {formatDate(fullscreenImage.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
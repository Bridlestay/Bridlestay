"use client";

import { useState, useRef, useCallback } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, FlipHorizontal, FlipVertical } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number; // e.g., 1 for square, 4/3 for landscape
  title?: string;
  minWidth?: number;
  minHeight?: number;
}

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  title = "Crop Image",
  minWidth = 100,
  minHeight = 100,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleZoom = useCallback((value: number[]) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoomTo(value[0]);
      setZoom(value[0]);
    }
  }, []);

  const handleRotate = useCallback((degrees: number) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const newRotation = rotation + degrees;
      cropper.rotateTo(newRotation);
      setRotation(newRotation);
    }
  }, [rotation]);

  const handleFlipH = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const newFlipH = !flipH;
      cropper.scaleX(newFlipH ? -1 : 1);
      setFlipH(newFlipH);
    }
  }, [flipH]);

  const handleFlipV = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const newFlipV = !flipV;
      cropper.scaleY(newFlipV ? -1 : 1);
      setFlipV(newFlipV);
    }
  }, [flipV]);

  const handleReset = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.reset();
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    }
  }, []);

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setLoading(true);

    const canvas = cropper.getCroppedCanvas({
      minWidth,
      minHeight,
      maxWidth: 2048,
      maxHeight: 2048,
      fillColor: "#fff",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    if (canvas) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
          }
          setLoading(false);
        },
        "image/jpeg",
        0.9
      );
    } else {
      setLoading(false);
    }
  }, [minWidth, minHeight, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to reposition, use controls to adjust. {aspectRatio === 1 ? "Image will be cropped to a square." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper */}
          <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: "400px" }}>
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              style={{ height: "100%", width: "100%" }}
              aspectRatio={aspectRatio}
              viewMode={1}
              guides={true}
              minCropBoxHeight={minHeight}
              minCropBoxWidth={minWidth}
              background={false}
              responsive={true}
              autoCropArea={0.8}
              checkOrientation={false}
              zoomOnWheel={true}
              wheelZoomRatio={0.1}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom */}
            <div className="flex items-center gap-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={handleZoom}
                min={0.1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Rotation & Flip Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate(-90)}
                title="Rotate left 90°"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate(90)}
                title="Rotate right 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={flipH ? "default" : "outline"}
                size="sm"
                onClick={handleFlipH}
                title="Flip horizontal"
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={flipV ? "default" : "outline"}
                size="sm"
                onClick={handleFlipV}
                title="Flip vertical"
              >
                <FlipVertical className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Reset"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={loading}>
            {loading ? "Processing..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  detectSingleFace,
  resetLiveness,
  analyseLivenessFrame,
  drawDetectionOverlay,
} from "../services/faceEngine";

interface FaceScannerProps {
  isActive: boolean;
  onScanComplete: (embedding: Float32Array) => void;
  onError?: (message: string) => void;
  onFaceDetected?: () => void;
}

export interface FaceScannerRef {
  startScan: () => void;
  stopCamera: () => void;
}

const FaceScanner = forwardRef<FaceScannerRef, FaceScannerProps>(
  ({ isActive, onScanComplete, onError, onFaceDetected }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isScanningRef = useRef<boolean>(false);
    const requestAnimationFrameRef = useRef<number | null>(null);
    const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [status, setStatus] = useState<string>("Initializing camera...");
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Expose methods to parent components via ref
    useImperativeHandle(ref, () => ({
      startScan: () => {
        if (!streamRef.current) {
          startCamera().then(() => {
            triggerScanLoop();
          }).catch(() => {
            // error is handled inside startCamera
          });
        } else {
          triggerScanLoop();
        }
      },
      stopCamera: () => {
        stopCamera();
      },
    }));

    const startCamera = async (): Promise<MediaStream> => {
      if (streamRef.current) return streamRef.current;
      setCameraError(null);
      setStatus("Starting camera...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Play the video stream
          await videoRef.current.play();
        }
        streamRef.current = stream;
        setStatus("Camera active");
        return stream;
      } catch (err: any) {
        console.error("[FaceScanner] Error starting camera:", err);
        const errMsg =
          err.name === "NotAllowedError"
            ? "Camera permission denied. Please grant permission in your browser."
            : "Could not access the camera. Check if it is being used by another app.";
        setCameraError(errMsg);
        setStatus("Camera error");
        if (onError) {
          onError(errMsg);
        }
        throw err;
      }
    };

    const stopCamera = () => {
      // Stop scanning loop
      isScanningRef.current = false;
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
        requestAnimationFrameRef.current = null;
      }

      // Stop WebRTC stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Clear the overlay canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      setStatus("Camera stopped");
    };

    const triggerScanLoop = () => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      setStatus("Scanning face. Move slightly...");
      resetLiveness();

      // Ensure we have a scratch canvas for liveness diff checks
      if (!scratchCanvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        scratchCanvasRef.current = canvas;
      }

      const scanLoop = async () => {
        if (!isScanningRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            // 1. Detect single face with landmarks & descriptor
            const detection = await detectSingleFace(video);

            // 2. Draw overlay bounding box and landmarks
            if (canvasRef.current) {
              drawDetectionOverlay(canvasRef.current, video, detection);
            }

            if (detection) {
              if (onFaceDetected) {
                onFaceDetected();
              }

              // 3. Analyze liveness (motion checks)
              if (scratchCanvasRef.current) {
                const liveness = analyseLivenessFrame(
                  video,
                  scratchCanvasRef.current
                );

                if (liveness.isLive) {
                  // Liveness passed, scan complete!
                  isScanningRef.current = false;
                  setStatus("Match found!");
                  onScanComplete(detection.descriptor);
                  return; // Exit loop
                } else {
                  setStatus("Liveness check: Move slightly or blink");
                }
              }
            } else {
              setStatus("No face detected. Align your face in the frame.");
            }
          } catch (err: any) {
            console.error("[FaceScanner] Error during scan loop:", err);
            // Don't terminate on temporary detection errors, keep trying
          }
        }

        // Schedule next frame check
        if (isScanningRef.current) {
          requestAnimationFrameRef.current = requestAnimationFrame(scanLoop);
        }
      };

      requestAnimationFrameRef.current = requestAnimationFrame(scanLoop);
    };

    // React to isActive prop changes
    useEffect(() => {
      if (isActive) {
        startCamera().catch(() => {});
      } else {
        stopCamera();
      }
      return () => {
        stopCamera();
      };
    }, [isActive]);

    return (
      <div style={styles.scannerContainer}>
        {cameraError ? (
          <div style={styles.errorBanner}>{cameraError}</div>
        ) : (
          <div style={styles.videoWrapper}>
            <video
              ref={videoRef}
              style={styles.video}
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} style={styles.canvas} />
          </div>
        )}
        <div style={styles.statusFooter}>
          <span style={styles.statusDot(isActive && !cameraError)} />
          <span style={styles.statusText}>{status}</span>
        </div>
      </div>
    );
  }
);

FaceScanner.displayName = "FaceScanner";

const styles = {
  scannerContainer: {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    background: "#090f1d",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
  },
  videoWrapper: {
    position: "relative" as const,
    width: "100%",
    aspectRatio: "4/3",
    background: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transform: "scaleX(-1)", // Mirror camera feed for naturally aligned movement
  },
  canvas: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
    transform: "scaleX(-1)", // Mirror drawing context to align with the video feed
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: "4/3",
    padding: "24px",
    textAlign: "center" as const,
    color: "#f87171",
    background: "rgba(239, 68, 68, 0.05)",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  statusFooter: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    background: "#0d1424",
    borderTop: "1px solid #1e293b",
  },
  statusDot: (active: boolean) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: active ? "#10b981" : "#64748b",
    boxShadow: active ? "0 0 8px #10b981" : "none",
    transition: "all 0.3s ease",
  }),
  statusText: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: 500,
  },
};

export default FaceScanner;
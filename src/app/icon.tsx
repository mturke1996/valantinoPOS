import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3D2B1F 0%, #2A1E16 100%)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            color: "#D4AF37",
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "serif",
          }}
        >
          V
        </div>
      </div>
    ),
    { ...size },
  );
}

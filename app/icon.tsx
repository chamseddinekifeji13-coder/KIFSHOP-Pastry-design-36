import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const contentType = "image/png"
export const size = {
  width: 512,
  height: 512,
}

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
          background: "linear-gradient(135deg, #c6a55f 0%, #8f6f2f 100%)",
          color: "#ffffff",
          fontSize: 168,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 96,
        }}
      >
        K
      </div>
    ),
    size
  )
}

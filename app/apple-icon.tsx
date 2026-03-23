import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const contentType = "image/png"
export const size = {
  width: 180,
  height: 180,
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c6a55f",
          color: "#ffffff",
          fontSize: 84,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 40,
        }}
      >
        K
      </div>
    ),
    size
  )
}

interface AudioPlayerProps {
  src?: string
  className?: string
}

export default function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  if (!src) {
    return (
      <div className={"border rounded p-4 text-center text-gray-400 " + className}>
        无音频
      </div>
    )
  }
  return (
    <div className={"border rounded p-4 " + className}>
      <audio controls className="w-full" src={src}>
        您的浏览器不支持 audio 元素
      </audio>
    </div>
  )
}

import ReactMarkdown from 'react-markdown'

interface MarkdownViewProps {
  content: string
  className?: string
}

export default function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  if (!content?.trim()) return null
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

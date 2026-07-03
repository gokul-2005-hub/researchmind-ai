/**
 * Utility functions for exporting study notes to Markdown, JSON, and Text formats on the client-side.
 */

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportNotesAsMarkdown = (title: string, content: string, paperTitle: string) => {
  const markdownText = `# ${title}\n\n*Reference Document: ${paperTitle}*\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n${content}`
  const sanitizedFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_notes.md`
  downloadFile(markdownText, sanitizedFilename, "text/markdown;charset=utf-8;")
}

export const exportNotesAsTXT = (title: string, content: string, paperTitle: string) => {
  const plainText = `TITLE: ${title}\nDOCUMENT: ${paperTitle}\nEXPORTED: ${new Date().toLocaleString()}\n\n=========================================\n\n${content}`
  const sanitizedFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_notes.txt`
  downloadFile(plainText, sanitizedFilename, "text/plain;charset=utf-8;")
}

export const exportNotesAsJSON = (title: string, content: string, paperTitle: string, authors: string[]) => {
  const payload = {
    notes_title: title,
    reference_paper: {
      title: paperTitle,
      authors: authors
    },
    notes_content: content,
    exported_at: new Date().toISOString()
  }
  const jsonText = JSON.stringify(payload, null, 2)
  const sanitizedFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_notes.json`
  downloadFile(jsonText, sanitizedFilename, "application/json;charset=utf-8;")
}

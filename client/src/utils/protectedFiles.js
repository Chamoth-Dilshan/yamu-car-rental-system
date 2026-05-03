import API from '../api/axios'

export const openProtectedFile = async (endpoint) => {
  const previewWindow = window.open('', '_blank', 'noopener,noreferrer')

  try {
    const res = await API.get(endpoint, { responseType: 'blob' })
    const contentType = res.headers['content-type'] || 'application/octet-stream'
    const blob = new Blob([res.data], { type: contentType })
    const url = URL.createObjectURL(blob)

    if (previewWindow) {
      previewWindow.location.href = url
    } else {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noreferrer'
      link.click()
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    if (previewWindow) {
      previewWindow.close()
    }

    throw error
  }
}

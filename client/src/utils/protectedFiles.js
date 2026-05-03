import API from '../api/axios'

export const createProtectedFileUrl = async (endpoint) => {
  const res = await API.get(endpoint, { responseType: 'blob' })
  const contentType = res.headers['content-type'] || res.data?.type || 'application/octet-stream'
  const blob = new Blob([res.data], { type: contentType })

  return {
    contentType,
    url: URL.createObjectURL(blob)
  }
}

export const openProtectedFile = async (endpoint) => {
  const previewWindow = window.open('', '_blank')
  if (previewWindow) {
    previewWindow.opener = null
  }

  try {
    const { url } = await createProtectedFileUrl(endpoint)

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

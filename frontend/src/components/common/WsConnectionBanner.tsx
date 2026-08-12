import { useEffect, useState } from 'react'
import { wsClient, type WsConnectionState } from '../../services/wsClient'

export default function WsConnectionBanner() {
  const [state, setState] = useState<WsConnectionState>(wsClient.connectionState)

  useEffect(() => {
    return wsClient.onConnectionStateChange(setState)
  }, [])

  if (state === 'connected') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900]">
      {state === 'disconnected' && (
        <div className="bg-gray-700 text-white text-center py-2 text-sm">
          WebSocket 未连接。
          <button
            onClick={() => wsClient.connect()}
            className="ml-2 underline hover:text-blue-300"
          >
            重新连接
          </button>
        </div>
      )}
      {state === 'connecting' && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm flex items-center justify-center gap-2">
          <span className="animate-spin">◌</span>
          正在连接服务器...
        </div>
      )}
      {state === 'reconnecting' && (
        <div className="bg-yellow-600 text-white text-center py-2 text-sm flex items-center justify-center gap-2">
          <span className="animate-spin">◌</span>
          连接断开，正在重连...
        </div>
      )}
    </div>
  )
}

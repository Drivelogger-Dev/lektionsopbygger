import { useState, useEffect } from 'react'
import Lektionsopbygger from './Lektionsopbygger'
import ModulFlow from './ModulFlow'

function App() {
  const [page, setPage] = useState(window.location.hash)

  useEffect(() => {
    const onHash = () => setPage(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (page === '#flow') return <ModulFlow />
  return <Lektionsopbygger />
}

export default App

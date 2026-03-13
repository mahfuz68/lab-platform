import dynamic from 'next/dynamic'

// Dynamically import the actual terminal component with no SSR
const DynamicTerminal = dynamic(
  () => import('./Terminal'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading terminal...
      </div>
    )
  }
)

export default DynamicTerminal

import RequestDetail from './pages/RequestDetail'

// Demo: use URL params or hard-coded values for development
const deliveryOrderId = new URLSearchParams(window.location.search).get('orderId') || 'demo-order-1'
const userId = new URLSearchParams(window.location.search).get('userId') || 'demo-user-1'

function App() {
  return <RequestDetail deliveryOrderId={deliveryOrderId} userId={userId} />
}

export default App

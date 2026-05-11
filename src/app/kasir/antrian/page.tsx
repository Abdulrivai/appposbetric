import { PageHeader } from '@/components/shared/PageHeader'
import { OrderQueue } from '@/components/kasir/OrderQueue'

export default function AntrianPage() {
  return (
    <div>
      <PageHeader title="Antrian Order" description="Order masuk hari ini — update realtime" />
      <OrderQueue />
    </div>
  )
}

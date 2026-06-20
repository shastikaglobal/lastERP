import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/button'

export default function CreateParty() {
  const nav = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Party"
        breadcrumbs={[{ label: 'Home' }, { label: 'Masters' }, { label: 'Parties' }, { label: 'Add Party' }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav(-1)}>
            Back
          </Button>
        }
      />

      <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
        <div className="text-lg font-semibold text-white mb-4">Create new party</div>
        <p className="text-sm text-slate-400">
          This page is a placeholder for the party creation flow. Add your form fields here to capture party details.
        </p>
      </div>
    </div>
  )
}

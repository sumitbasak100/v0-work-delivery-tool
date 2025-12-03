import { Badge } from "@/components/ui/badge"
import { Check, Clock, AlertCircle } from "lucide-react"
import type { FileStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: FileStatus
  className?: string
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-status-pending/20 text-status-pending border-status-pending/30",
  },
  approved: {
    label: "Approved",
    icon: Check,
    className: "bg-status-approved/20 text-status-approved border-status-approved/30",
  },
  needs_changes: {
    label: "Needs Changes",
    icon: AlertCircle,
    className: "bg-status-needs-changes/20 text-status-needs-changes border-status-needs-changes/30",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium border", config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

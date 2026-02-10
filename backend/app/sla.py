"""
SLA and Cost-of-Delay computation utilities for CivicPulse.
Provides government-grade SLA tracking and economic impact metrics.
"""
from datetime import datetime, timedelta
from typing import Optional


# SLA targets in hours based on priority
SLA_TARGETS = {
    'urgent': 1,    # 1 hour for urgent issues
    'high': 4,      # 4 hours for high priority
    'normal': 24,   # 24 hours for normal priority
}

# Cost constants for economic impact calculation
# Cost is per citizen-hour affected (in INR for demo)
COST_CONSTANTS = {
    'per_citizen_hour': 50,  # Base cost per citizen affected per hour
    'severity_multiplier': {
        'water_outage': 2.5,      # Critical - health impact
        'electricity_outage': 2.0, # High - productivity impact
        'sewage': 1.8,            # High - sanitation/health
        'garbage': 1.2,           # Medium - hygiene
        'road': 1.5,              # Medium-High - safety
        'streetlight': 1.0,       # Normal - safety at night
    },
    'size_bonus': {
        5: 1.2,   # 20% more if 5+ citizens
        10: 1.5,  # 50% more if 10+ citizens
        20: 2.0,  # 100% more if 20+ citizens (major incident)
    },
}


def get_sla_target_hours(priority: str) -> float:
    """Get SLA target hours based on priority level."""
    return SLA_TARGETS.get(priority, SLA_TARGETS['normal'])


def compute_sla_deadline(created_at: datetime, priority: str) -> datetime:
    """Compute SLA deadline based on creation time and priority."""
    target_hours = get_sla_target_hours(priority)
    return created_at + timedelta(hours=target_hours)


def check_sla_breach(deadline: datetime, resolved_at: Optional[datetime] = None) -> bool:
    """Check if SLA has been breached."""
    compare_time = resolved_at or datetime.utcnow()
    return compare_time > deadline


def get_hours_open(created_at: datetime, resolved_at: Optional[datetime] = None) -> float:
    """Calculate how many hours a cluster has been open."""
    end_time = resolved_at or datetime.utcnow()
    delta = end_time - created_at
    return delta.total_seconds() / 3600


def get_severity_multiplier(intent: str) -> float:
    """Get cost multiplier based on issue type."""
    return COST_CONSTANTS['severity_multiplier'].get(intent, 1.0)


def get_size_bonus(citizen_count: int) -> float:
    """Get bonus multiplier based on number of affected citizens."""
    for threshold, bonus in sorted(COST_CONSTANTS['size_bonus'].items(), reverse=True):
        if citizen_count >= threshold:
            return bonus
    return 1.0


def compute_cost_of_delay(
    intent: str,
    citizen_count: int,
    hours_open: float,
    is_resolved: bool = False
) -> dict:
    """
    Compute cost-of-delay metric for a cluster.
    
    Returns dict with:
    - total_cost: Total economic cost so far
    - hourly_rate: Cost per hour if not resolved
    - breakdown: Component breakdown
    """
    base_rate = COST_CONSTANTS['per_citizen_hour']
    severity_mult = get_severity_multiplier(intent)
    size_bonus = get_size_bonus(citizen_count)
    
    hourly_rate = base_rate * citizen_count * severity_mult * size_bonus
    total_cost = hourly_rate * hours_open
    
    return {
        'total_cost': round(total_cost, 2),
        'hourly_rate': round(hourly_rate, 2) if not is_resolved else 0,
        'hours_open': round(hours_open, 2),
        'breakdown': {
            'base_rate_per_citizen': base_rate,
            'citizen_count': citizen_count,
            'severity_multiplier': severity_mult,
            'size_bonus': size_bonus,
            'intent': intent,
        },
        'currency': 'INR',
        'is_resolved': is_resolved,
    }


def compute_cluster_sla_status(cluster) -> dict:
    """
    Compute comprehensive SLA status for a cluster.
    
    Returns dict with SLA metrics and breach status.
    """
    created_at = cluster.created_at
    priority = cluster.priority
    resolved_at = getattr(cluster, 'resolved_at', None)
    
    # Compute SLA
    target_hours = get_sla_target_hours(priority)
    deadline = compute_sla_deadline(created_at, priority)
    hours_open = get_hours_open(created_at, resolved_at)
    is_breached = check_sla_breach(deadline, resolved_at)
    
    # Time remaining (negative if breached)
    now = datetime.utcnow()
    if resolved_at:
        time_remaining = 0
    else:
        time_remaining = (deadline - now).total_seconds() / 3600
    
    return {
        'sla_target_hours': target_hours,
        'sla_deadline': deadline.isoformat(),
        'is_breached': is_breached,
        'hours_open': round(hours_open, 2),
        'time_remaining_hours': round(time_remaining, 2),
        'status': 'breached' if is_breached else ('resolved' if resolved_at else 'on_track'),
        'priority': priority,
    }


def get_sla_summary(clusters: list) -> dict:
    """
    Get SLA summary statistics across all clusters.
    """
    total = len(clusters)
    breached = 0
    at_risk = 0  # <1 hour remaining
    on_track = 0
    resolved = 0
    
    total_cost = 0
    active_hourly_rate = 0
    
    for cluster in clusters:
        sla_status = compute_cluster_sla_status(cluster)
        is_resolved = getattr(cluster, 'resolved_at', None) is not None
        
        if is_resolved:
            resolved += 1
        elif sla_status['is_breached']:
            breached += 1
        elif sla_status['time_remaining_hours'] < 1:
            at_risk += 1
        else:
            on_track += 1
        
        # Compute cost
        citizen_count = getattr(cluster, 'size', 1) or 1
        cost_info = compute_cost_of_delay(
            cluster.intent,
            citizen_count,
            sla_status['hours_open'],
            is_resolved
        )
        total_cost += cost_info['total_cost']
        if not is_resolved:
            active_hourly_rate += cost_info['hourly_rate']
    
    return {
        'total_clusters': total,
        'breached': breached,
        'at_risk': at_risk,
        'on_track': on_track,
        'resolved': resolved,
        'breach_rate': round(breached / total * 100, 1) if total > 0 else 0,
        'total_cost_incurred': round(total_cost, 2),
        'active_hourly_rate': round(active_hourly_rate, 2),
        'currency': 'INR',
    }

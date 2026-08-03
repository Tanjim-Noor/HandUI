import { NavLink } from 'react-router-dom';
import { demos } from '../demos/registry';

export function CapabilityRail() {
  return (
    <aside className="capability-rail" aria-label="Capability gallery">
      <p className="eyebrow">Capability index</p>
      <nav>
        {demos.map((demo, index) => (
          <NavLink
            key={demo.id}
            to={demo.route}
            className={({ isActive }) => (isActive ? 'capability-link active' : 'capability-link')}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{demo.title}</strong>
            <small>{demo.capabilities.map((item) => item.id).join(' · ')}</small>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import TodayTasks from '../components/today/TodayTasks.jsx'
import TodayMeetings from '../components/today/TodayMeetings.jsx'
import TodayMoney from '../components/today/TodayMoney.jsx'
import { DSPage } from '../design-system'

export default function Today() {
  return (
    <DSPage title="Today">
      <div className="today-grid">
        <TodayTasks />
        <TodayMeetings />
        <TodayMoney />
      </div>
    </DSPage>
  )
}



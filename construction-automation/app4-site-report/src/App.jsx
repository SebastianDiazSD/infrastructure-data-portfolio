import { useState } from 'react'

function App() {
  const [projectName, setProjectName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [inspector, setInspector] = useState('')

  return (
    <div>
      <h2>Site Report Generator</h2>

      <input
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Project name"
      />
      <input
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location"
      />
      <input
        value={date}
        onChange={e => setDate(e.target.value)}
        placeholder="Date"
      />
      <input
        value={inspector}
        onChange={e => setInspector(e.target.value)}
        placeholder="Inspector name"
      />

      <h3>Preview</h3>
      <p>Project: {projectName}</p>
      <p>Location: {location}</p>
      <p>Date: {date}</p>
      <p>Inspector: {inspector}</p>
    </div>
  )
}

export default App

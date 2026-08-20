<header>My Bots <button>Add Bot</button></header>
<main>
  {bots.map(bot => (
    <div className="ios-card">
      <img src={bot.avatar} />
      <h3>{bot.name}</h3>
      <span>{bot.scriptCount} scripts</span>
    </div>
  ))}
</main>

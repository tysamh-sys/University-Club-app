async function seed() {
    const BASE_URL = 'https://desktop-tutorial-6xzd.onrender.com';
    let token;

    try {
        console.log('Authenticating...');
        const payload = { email: 'seeder_admin@tpl.tn', password: 'password123' };
        let loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        let loginData = await loginRes.json();
        
        if (loginData.token) {
            token = loginData.token;
        } else {
            console.log('Registering Seeder User...');
            let regRes = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Seeder Admin', email: payload.email, password: payload.password })
            });
            let regData = await regRes.json();
            token = regData.token;
        }

        if (!token) {
            console.error('Failed to authenticate', loginData);
            return;
        }
        
        console.log('✅ Authenticated. Seeding Events...');

        const events = [
          {
            title: "React Advanced Workshop",
            description: "Learn advanced React Native architectures.",
            date: "2026-04-25T14:00:00Z"
          },
          {
            title: "Spring Hackathon 2026",
            description: "Annual 48-hour hackathon.",
            date: "2026-05-05T09:00:00Z"
          },
          {
            title: "AI & Sustainability Tech Talk",
            description: "Applying AI to eco-friendly problems.",
            date: "2026-05-15T18:00:00Z"
          },
          {
            title: "Career Fair 2026",
            description: "Meet our sponsors and network with tech companies.",
            date: "2026-06-02T09:00:00Z"
          }
        ];

        for (const ev of events) {
            const res = await fetch(`${BASE_URL}/events`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(ev)
            });
            const data = await res.json();
            console.log("   Added Event: ", data.title ? data.title : data);
        }

        console.log('✅ Seeding complete! 🎉');

    } catch (e) {
        console.error(e);
    }
}

seed();

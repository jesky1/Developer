import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://goalzone-live.vercel.app'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params

    try {
        const { db } = await import('@/lib/db')

        // Try to find team from standings (team ID is the team name)
        const decodedName = decodeURIComponent(id)

        const standing = await db.standing.findFirst({
            where: { team: decodedName },
            select: {
                team: true,
                league: true,
                position: true,
                played: true,
                won: true,
                drawn: true,
                lost: true,
                points: true,
            },
        })

        if (!standing) {
            return {
                title: 'Team Not Found',
                description: 'This team could not be found on GOALZONE.',
            }
        }

        const title = `${standing.team} - Standings, Squad & Fixtures | ${standing.league}`
        const description = `${standing.team} football club - ${standing.league} position: ${standing.position} | ${standing.won}W ${standing.drawn}D ${standing.lost}L | ${standing.points} points. Squad, fixtures, stats & live scores on GOALZONE.`

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'profile',
                url: `${SITE_URL}/team/${id}`,
                siteName: 'GOALZONE',
                images: [
                    {
                        url: '/goalzone-logo.png',
                        width: 1024,
                        height: 1024,
                        alt: `${standing.team} - GOALZONE`,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: ['/goalzone-logo.png'],
            },
            alternates: {
                canonical: `${SITE_URL}/team/${id}`,
            },
        }
    } catch {
        return {
            title: 'Team Details',
            description: 'Football team details, squad, fixtures & stats on GOALZONE.',
        }
    }
}

export default function TeamLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}

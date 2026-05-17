import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://goalzone-live.vercel.app'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params

    try {
        const { db } = await import('@/lib/db')
        const match = await db.match.findUnique({
            where: { id },
            select: {
                homeTeam: true,
                awayTeam: true,
                homeScore: true,
                awayScore: true,
                status: true,
                league: true,
                minute: true,
                kickoff: true,
                stadium: true,
            },
        })

        if (!match) {
            return {
                title: 'Match Not Found',
                description: 'This match could not be found on GOALZONE.',
            }
        }

        const scoreText = match.status === 'UPCOMING'
            ? `${match.kickoff || 'Upcoming'}`
            : `${match.homeScore} - ${match.awayScore}`

        const statusText = match.status === 'LIVE'
            ? `LIVE ${match.minute}'`
            : match.status === 'FT'
                ? 'Full Time'
                : match.status === 'HT'
                    ? 'Half Time'
                    : 'Upcoming'

        const title = `${match.homeTeam} vs ${match.awayTeam} ${scoreText} | ${match.league}`
        const description = `${statusText}: ${match.homeTeam} vs ${match.awayTeam} - ${scoreText}. ${match.league} match ${match.stadium ? `at ${match.stadium}` : ''}. Live scores, stats & lineups on GOALZONE.`

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'article',
                url: `${SITE_URL}/match/${id}`,
                siteName: 'GOALZONE',
                images: [
                    {
                        url: '/goalzone-logo.png',
                        width: 1024,
                        height: 1024,
                        alt: `${match.homeTeam} vs ${match.awayTeam}`,
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
                canonical: `${SITE_URL}/match/${id}`,
            },
        }
    } catch {
        return {
            title: 'Match Details',
            description: 'Live football match details on GOALZONE.',
        }
    }
}

export default function MatchLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}

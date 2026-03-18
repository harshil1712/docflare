import { useEffect, useMemo, useState } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Button, Toasty, TooltipProvider, cn } from '@cloudflare/kumo'
import { List, X } from '@phosphor-icons/react'
import { Sidebar } from '../components/Sidebar'
import { useDocuments } from '../lib/use-documents'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'Docflare',
			},
		],
		links: [
			{
				rel: 'preconnect',
				href: 'https://fonts.googleapis.com',
			},
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous',
			},
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap',
			},
			{
				rel: 'stylesheet',
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootLayout,
})

function RootLayout() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true)
	const [isMobileViewport, setIsMobileViewport] = useState(false)
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const { sidebarDocuments, documents } = useDocuments()

	useEffect(() => {
		const handleResize = () => {
			const isMobile = window.innerWidth < 1024
			setIsMobileViewport(isMobile)
			setIsSidebarOpen(!isMobile)
		}

		handleResize()
		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])

	const headerTitle = pathname.startsWith('/chat') ? 'Chat' : 'Documents'
	const indexedCount = useMemo(
		() => documents.filter((document) => document.status === 'indexed').length,
		[documents]
	)

	return (
		<TooltipProvider>
			<div className="h-screen flex bg-[var(--color-archival-bg)] font-sans relative">
				<Sidebar
					isOpen={isSidebarOpen}
					onClose={() => setIsSidebarOpen(false)}
					onNavigate={() => {
						if (isMobileViewport) {
							setIsSidebarOpen(false)
						}
					}}
					documents={sidebarDocuments}
					currentPath={pathname}
				/>

				<div
					className={cn(
						'flex-1 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden bg-[var(--color-archival-bg)]',
						isSidebarOpen && 'lg:ml-80'
					)}
				>
					<div className="flex items-center justify-between px-6 py-4 min-h-[73px] border-b border-[var(--color-archival-border)] bg-[var(--color-archival-bg)] relative z-20">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								shape="square"
								size="base"
								icon={isSidebarOpen ? X : List}
								className={cn(
									'text-[var(--color-archival-ink)] hover:text-[var(--color-archival-accent)] transition-colors',
									isSidebarOpen && 'lg:hidden'
								)}
								onClick={() => setIsSidebarOpen((current) => !current)}
								aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
							/>
							<div className="font-mono text-xs uppercase tracking-widest text-[var(--color-archival-ink)]/60 font-medium">
								{headerTitle}
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2 px-2 py-1 border border-[var(--color-archival-ink)]/20 bg-[var(--color-archival-bg)] font-mono text-[10px] uppercase tracking-wider text-[var(--color-archival-ink)]">
								<div className="w-1.5 h-1.5 bg-[var(--color-archival-accent)] rounded-none" />
								<span>{indexedCount} INDEXED</span>
							</div>
						</div>
					</div>

					<Outlet />
				</div>
			</div>
		</TooltipProvider>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-[var(--color-archival-bg)] text-[var(--color-archival-ink)] font-sans antialiased min-h-screen">
				<div className="bg-noise" aria-hidden="true" />
				<Toasty>
					{children}
				</Toasty>
				<TanStackDevtools
					config={{
						position: 'bottom-right',
					}}
					plugins={[
						{
							name: 'Tanstack Router',
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	)
}

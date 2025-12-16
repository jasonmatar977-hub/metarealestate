# Migration Notes

## Old HTML Files

The project previously consisted of static HTML files. These have been preserved in the root directory for reference:

- `index.html` - Original landing page
- `lebanon.html`, `usa.html`, `spain.html`, `australia.html` - Country-specific pages
- `more-communities.html` - Countries listing page
- Other country HTML files (40+ files)

## New Next.js Structure

The application has been migrated to Next.js 15 with:
- React components instead of static HTML
- TypeScript for type safety
- Tailwind CSS for styling
- App Router for routing
- API routes for backend functionality

## Next Steps

1. **Backend Integration**: Replace mock data with real API calls
2. **Database Setup**: Add database for user accounts and property listings
3. **Image Assets**: Move images to `public/` folder if needed
4. **Old Files Cleanup**: Once migration is complete, old HTML files can be archived or removed


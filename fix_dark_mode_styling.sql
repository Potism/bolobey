-- Fix Dark Mode Styling for Admin Dashboard
-- This is a reference file for the styling fixes needed

/*
The issue is that the admin dashboard has hardcoded text-gray-600 classes 
instead of using proper dark mode classes like text-muted-foreground.

Here are the specific fixes needed in components/admin-prizes-dashboard.tsx:

1. Replace all instances of "text-gray-600" with "text-muted-foreground"
2. Replace "text-gray-500" with "text-muted-foreground" 
3. Ensure proper dark mode support for all text elements

The main container should also have proper dark mode classes.
*/

-- This is just a reference file - the actual fixes need to be made in the TypeScript component 
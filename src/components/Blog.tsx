import { useState, useMemo } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Calendar, Clock, ArrowUpRight, Search, X, Filter } from "lucide-react";

const blogPosts = [
  {
    id: 1,
    title: "The Future of Explainable AI in Healthcare",
    excerpt:
      "Exploring how interpretable machine learning models are revolutionizing medical diagnostics and building trust between AI systems and healthcare professionals.",
    category: "AI Ethics",
    readTime: "8 min read",
    date: "Dec 15, 2024",
    featured: true,
    tags: ["XAI", "Healthcare", "Ethics", "Interpretability", "Medical AI"],
  },
  {
    id: 2,
    title: "MLOps Best Practices: From Prototype to Production",
    excerpt:
      "A comprehensive guide to deploying machine learning models at scale, covering CI/CD pipelines, model monitoring, and automated retraining strategies.",
    category: "MLOps",
    readTime: "12 min read",
    date: "Nov 28, 2024",
    featured: true,
    tags: [
      "MLOps",
      "DevOps",
      "Deployment",
      "CI/CD",
      "Monitoring",
      "Production",
    ],
  },
  {
    id: 3,
    title: "Transformer Architecture: Beyond Language Models",
    excerpt:
      "How attention mechanisms are being applied to computer vision, time series forecasting, and multimodal AI applications.",
    category: "Deep Learning",
    readTime: "10 min read",
    date: "Nov 10, 2024",
    featured: false,
    tags: [
      "Transformers",
      "Vision",
      "Multimodal",
      "Attention",
      "Computer Vision",
      "Time Series",
    ],
  },
  {
    id: 4,
    title: "Data Privacy in the Age of Large Language Models",
    excerpt:
      "Addressing privacy concerns and implementing differential privacy techniques when working with sensitive data in LLM training and inference.",
    category: "Privacy",
    readTime: "7 min read",
    date: "Oct 22, 2024",
    featured: false,
    tags: [
      "Privacy",
      "LLMs",
      "Security",
      "Differential Privacy",
      "Data Protection",
    ],
  },
  {
    id: 5,
    title: "Real-Time Feature Engineering with Apache Kafka",
    excerpt:
      "Building scalable streaming data pipelines for machine learning applications using Kafka, feature stores, and real-time inference systems.",
    category: "Data Engineering",
    readTime: "15 min read",
    date: "Oct 5, 2024",
    featured: false,
    tags: [
      "Kafka",
      "Streaming",
      "Features",
      "Real-time",
      "Data Pipeline",
      "Feature Store",
    ],
  },
  {
    id: 6,
    title: "The Economics of AI: Cost-Benefit Analysis for ML Projects",
    excerpt:
      "A framework for evaluating the business value of machine learning initiatives and optimizing resource allocation for maximum ROI.",
    category: "AI Strategy",
    readTime: "9 min read",
    date: "Sep 18, 2024",
    featured: false,
    tags: ["ROI", "Strategy", "Business", "Economics", "ML Projects", "Value"],
  },
];

// Extract all unique tags from blog posts
const allTags = Array.from(
  new Set(blogPosts.flatMap((post) => post.tags))
).sort();

const categories = [
  "All",
  "AI Ethics",
  "MLOps",
  "Deep Learning",
  "Privacy",
  "Data Engineering",
  "AI Strategy",
];

export function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Filter posts based on search query, category, and selected tags
  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Category filter
      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((selectedTag) => post.tags.includes(selectedTag));

      return matchesSearch && matchesCategory && matchesTags;
    });
  }, [searchQuery, selectedCategory, selectedTags]);

  const featuredPosts = filteredPosts.filter((post) => post.featured);
  const otherPosts = filteredPosts.filter((post) => !post.featured);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedTags([]);
  };

  const hasActiveFilters =
    searchQuery !== "" || selectedCategory !== "All" || selectedTags.length > 0;

  return (
    <section id="blog" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="mb-4">Thought Leadership</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            Insights on artificial intelligence, machine learning, and data
            science from the front lines of innovation. Sharing knowledge and
            exploring the future of intelligent systems.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-12 space-y-6">
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={
                  category === selectedCategory ? "default" : "secondary"
                }
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Advanced Tag Filter */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Filter by tags:
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-200 hover:scale-105"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Active Filters and Clear Button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory !== "All" && (
                  <Badge variant="secondary" className="gap-1">
                    Category: {selectedCategory}
                    <button onClick={() => setSelectedCategory("All")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleTagToggle(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Results Counter */}
          <div className="text-center text-sm text-muted-foreground">
            {filteredPosts.length === 0 ? (
              <span>No articles found matching your criteria.</span>
            ) : (
              <span>
                Showing {filteredPosts.length} of {blogPosts.length} articles
              </span>
            )}
          </div>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-16">
            <h3 className="mb-8 text-center">Featured Articles</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-card"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{post.category}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h4 className="group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{post.tags.length - 4} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Other Posts Grid */}
        {otherPosts.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {otherPosts.map((post) => (
              <Card
                key={post.id}
                className="group hover:shadow-md transition-all duration-300 cursor-pointer border-0 bg-card"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {post.category}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="group-hover:text-primary transition-colors leading-tight text-sm">
                    {post.title}
                  </h4>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {post.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{post.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or clearing some filters to see
                more results.
              </p>
              <Button onClick={clearAllFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        {/* View All Articles Button - only show if there are results */}
        {filteredPosts.length > 0 && (
          <div className="text-center">
            <Button variant="outline" className="flex items-center gap-2">
              View All Articles
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
